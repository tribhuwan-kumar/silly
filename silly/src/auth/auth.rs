use argon2::{
    Argon2, 
    PasswordHash,
    PasswordVerifier,
    password_hash::{
        SaltString,
        PasswordHasher,
        rand_core::OsRng,
    },
};
use jsonwebtoken::{
    encode, Header,
    EncodingKey,
};
use tracing::{info, warn};
use sqlx::{Pool, Sqlite, Row};
use std::time::{SystemTime, UNIX_EPOCH};
use super::types::{
    AuthController, Role,
    Claims, User, AuthError,
};

pub const COOKIE_VAILDITY_DURATION: usize = 24 * 60 * 60 * 15; 

impl AuthController {
    fn hash_password(password: &str) -> Result<String, AuthError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        argon2
            .hash_password(password.as_bytes(), &salt)
            .map(|h| h.to_string())
            .map_err(|_| AuthError::PasswordHashError)
    }

    /// Just verify the string duh!! :D
    fn verify_password(password: &str, password_hash: &str) -> Result<bool, AuthError> {
        let parsed_hash = PasswordHash::new(password_hash)
            .map_err(|_| AuthError::PasswordHashError)?;
        
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    /// Pass it directly from main -> state 
    fn create_token(username: &str, uid: i64, role: Role, secret: &[u8]) -> Result<String, AuthError> {
        let expiration = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize + COOKIE_VAILDITY_DURATION;

        let claims = Claims {
            uid: uid,
            role: role,
            exp: expiration,
            sub: username.to_string(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret),
        )
        .map_err(|_| AuthError::TokenCreationError)
    }

    /// Verification of Credentials and return a jwt string
    pub async fn login(
        pool: &Pool<Sqlite>,
        username: &str,
        password: &str,
        jwt_secret: &str,
    ) -> Result<String, AuthError> {
        let row = sqlx::query("SELECT id, password_hash, role FROM users WHERE username = ?")
            .bind(username)
            .fetch_optional(pool)
            .await?;

        let row = match row {
            Some(r) => r,
            None => return Err(AuthError::InvalidCredentials),
        };

        let uid: i64 = row.get("id");
        let role_str: String = row.get("role");
        let role = Role::try_from(role_str.as_str())
            .map_err(|_| AuthError::InvalidRole)?;
        let stored_hash: String = row.get("password_hash");

        if !Self::verify_password(password, &stored_hash)? {
            return Err(AuthError::InvalidCredentials);
        }

        let token = Self::create_token(username, uid, role, jwt_secret.as_bytes())?;
        
        info!("User '{}' logged in successfully", username);
        Ok(token)
    }

    /// Create initial admin (only allow if table is empty)
    pub async fn init_admin(
        pool: &Pool<Sqlite>,
        username: &str,
        password: &str,
    ) -> Result<User, AuthError> {
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users WHERE role = 'admin'")
            .fetch_one(pool)
            .await?;

        if count.0 > 0 {
            warn!("Database is initialized, Users already exists!!");
            return Err(AuthError::AdminAlreadyRegistered);
        }

        let password_hash = Self::hash_password(password)?;
        let role = Role::Admin;
        
        let id = sqlx::query(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
        )
        .bind(username)
        .bind(password_hash)
        .bind(role.to_string())
        .execute(pool)
        .await?
        .last_insert_rowid();

        info!("Initial admin created: {:?}", username);

        Ok(User {
            id: id,
            username: username.to_string(),
            role: role,
        })
    }

    /// Create standard user, can be only invoked by admin
    pub async fn create_user(
        pool: &Pool<Sqlite>,
        requester_username: &str,
        username: &str,
        password: &str,
    ) -> Result<User, AuthError> {
        let requester_role = Self::get_user_role(pool, requester_username).await?;

        if requester_role != Role::Admin {
            return Err(AuthError::Unauthorized);
        }

        let exists: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users WHERE username = ?")
            .bind(username)
            .fetch_one(pool)
            .await?;
        
        if exists.0 > 0 {
            return Err(AuthError::UserAlreadyExists);
        }

        let password_hash = Self::hash_password(password)?;
        let role = Role::User;

        let result = sqlx::query(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
        )
        .bind(username)
        .bind(password_hash)
        .bind(role.to_string())
        .execute(pool)
        .await;

        match result.map_err(AuthError::from) {
            Ok(res) => {
                info!("User created: {:?}", username.to_string());
                Ok(User {
                    id: res.last_insert_rowid(),
                    username: username.to_string(),
                    role,
                })
            } 
            Err(AuthError::DbError(sqlx::Error::Database(db_err)))
            if db_err.message().contains("UNIQUE") => {
                Err(AuthError::UserAlreadyExists)
            }
            Err(e) => Err(e),
        }
    }

    
    /// Called by admin to delete users
    pub async fn delete_user(
        pool: &Pool<Sqlite>,
        requester_username: &str,
        target_username: &str,
    ) -> Result<(), AuthError> {
        let requester_role = Self::get_user_role(pool, requester_username).await?;
        if requester_role != Role::Admin {
            return Err(AuthError::Unauthorized);
        }
        /* 
          * Prevent admin from deleting itself
          * Don't delete user if a single admin exists
        */
        if requester_username == target_username {
            return Err(AuthError::CannotDeleteSelf);
        }

        let admin_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users WHERE role = 'admin'")
            .fetch_one(pool)
            .await?;

        let target_is_admin: Option<(i64,)> = sqlx::query_as(
            "SELECT COUNT(*) FROM users WHERE username = ? AND role = 'admin'"
        )
        .bind(target_username)
        .fetch_optional(pool)
        .await?;

        if let Some((count,)) = target_is_admin {
            if count > 0 && admin_count.0 <= 1 {
                return Err(AuthError::CannotDeleteLastAdmin);
            }
        }

        sqlx::query("DELETE FROM users WHERE username = ?")
            .bind(target_username)
            .execute(pool)
            .await?;
            
        Ok(())
    }

    async fn get_user_role(
        pool: &Pool<Sqlite>,
        username: &str,
    ) -> Result<Role, AuthError> {
        let role: Option<String> = sqlx::query_scalar(
            "SELECT role FROM users WHERE username = ?"
        )
            .bind(username)
            .fetch_optional(pool)
        .await?;

        match role {
            Some(r) => Role::try_from(r.as_str()).map_err(|_| AuthError::InvalidRole),
            None => Err(AuthError::UserNotFound),
        }
    }
}
