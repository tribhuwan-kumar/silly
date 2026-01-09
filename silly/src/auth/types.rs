use serde::{Deserialize, Serialize};

pub struct AuthController;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    #[serde(rename = "admin")]
    Admin,
    #[serde(rename = "user")]
    User,
} 

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::Admin => write!(f, "admin"),
            Role::User => write!(f, "user"),
        }
    }
}

impl TryFrom<&str> for Role {
    type Error = ();
    fn try_from(s: &str) -> Result<Self, Self::Error> {
        match s {
            "admin" => Ok(Role::Admin),
            "user" => Ok(Role::User),
            _ => Err(()),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct User {
    pub id: i64,
    pub role: Role,
    pub username: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub uid: i64,
    pub sub: String,  
    pub role: Role,
    pub exp: usize,  
}

/// for Auth operations
#[derive(Debug)]
pub enum AuthError {
    InvalidRole,
    Unauthorized,
    UserNotFound,
    CannotDeleteSelf,
    UserAlreadyExists,
    PasswordHashError,
    InvalidCredentials,
    TokenCreationError,
    DbError(sqlx::Error),
    CannotDeleteLastAdmin,
    AdminAlreadyRegistered,
}

impl From<sqlx::Error> for AuthError {
    fn from(err: sqlx::Error) -> Self {
        AuthError::DbError(err)
    }
}

#[derive(Deserialize)]
pub struct RegAdminRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct CreateUserReq {
    pub username: String,
    pub password: String,
    pub requester_username: String,
}

#[derive(Deserialize)]
pub struct DeleteUserReq {
    pub requester_username: String,
    pub target_username: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub id: i64,
    pub username: String,
    pub role: String,
}
