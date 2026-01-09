use serde_json::json;
use axum::{
    extract,
    extract::{
        Json,
        State,
        FromRef,
        FromRequestParts,
    },
    http::{request::Parts, StatusCode},
    response::{IntoResponse},
    
};
use axum_extra::extract::cookie::{
    Cookie,
    SameSite,
    CookieJar
};
use jsonwebtoken::{
    decode,
    Validation,
    DecodingKey
};

use crate::{
    app::AppState,
    auth::{
        types::{
            Claims,
            AuthController,
            AuthError,
            AuthenticatedUser,
            LoginRequest,
            RegAdminRequest,
            CreateUserReq,
            DeleteUserReq,
        },
        auth::COOKIE_VAILDITY_DURATION,
    },
}; 

/// Make an initial admin
pub async fn reg_admin(
    State(state): State<AppState>,
    Json(payload): Json<RegAdminRequest>,
) -> impl IntoResponse {
    match AuthController::init_admin(&state.db, &payload.username, &payload.password).await {
        Ok(user) => (StatusCode::OK, Json(json!({ "status": "ok", "user": user.username }))),
        Err(AuthError::AdminAlreadyRegistered) => (
            StatusCode::FORBIDDEN, 
            Json(json!({ "error": "Admin already registered" }))
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR, 
            Json(json!({ "error": format!("{:?}", e) }))
        ),
    }
}


/// create user, FIX: later create user with admin rights
pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserReq>,
) -> impl IntoResponse {
    match AuthController::create_user(
        &state.db,
        &payload.requester_username,
        &payload.username,
        &payload.password
    ).await {
        Ok(user) => (StatusCode::OK, Json(json!({ "status": "ok", "user": user.username }))),
        Err(AuthError::Unauthorized) => (
            StatusCode::FORBIDDEN, 
            Json(json!({ "error": "Failed to create the username" }))
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR, 
            Json(json!({ "error": format!("{:?}", e) }))
        ),
    }
}



/// delete delete delete!!
pub async fn delete_user(
    State(state): State<AppState>,
    Json(payload): Json<DeleteUserReq>,
) -> impl IntoResponse {
    match AuthController::delete_user(
        &state.db,
        &payload.requester_username,
        &payload.target_username,
    ).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "ok"} ))),
        Err(AuthError::Unauthorized) => (
            StatusCode::FORBIDDEN, 
            Json(json!({ "error": "Failed to delete the username" }))
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR, 
            Json(json!({ "error": format!("{:?}", e) }))
        ),
    }
}


/// Cookie based login
pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    match AuthController::login(&state.db, &payload.username, &payload.password, &state.jwt_secret).await {
        Ok(token) => {
            let cookie = Cookie::build(("auth_token", token))
                .path("/")
                .secure(false)                  /* TODO: SSL implementation */
                .http_only(true)
                .same_site(SameSite::Strict)
                .max_age(time::Duration::days(COOKIE_VAILDITY_DURATION as i64))
                .build();

            (
                StatusCode::OK,
                jar.add(cookie),
                Json(json!({ 
                    "status": "ok", 
                    "username": payload.username
                }))
            )
        },
        Err(_) => (
            StatusCode::UNAUTHORIZED,
            jar, 
            Json(json!({ "error": "Invalid username or password" }))
        ),
    }
}

/// Just remove the cookie
pub async fn logout(jar: CookieJar) -> impl IntoResponse {
    (
        StatusCode::OK,
        jar.remove(Cookie::from("auth_token")),
        Json(json!({ "status": "loggedOut" }))
    )
}

/// Vaildate the cookie
pub async fn get_me(
    State(state): State<AppState>,
    jar: CookieJar,
) -> impl IntoResponse {
    if let Some(token_cookie) = jar.get("auth_token") {
        let token = token_cookie.value();
        /* Verify manually */
        let validation = Validation::default();
        let key = DecodingKey::from_secret(state.jwt_secret.as_bytes());
        match decode::<Claims>(token, &key, &validation) {
            Ok(token_data) => {
                return (
                    StatusCode::OK,
                    Json(json!({ 
                        "authenticated": true, 
                        "role": token_data.claims.role,
                        "username": token_data.claims.sub,
                        // "uid": token_data.claims.uid,       /* why pass uid */
                    }))
                );
            }
            // token invalid or expired
            Err(_) => {}
        }
    }

    (
        StatusCode::UNAUTHORIZED,
        Json(json!({ "authenticated": false }))
    )
}

/// Extract the authenticated infos
impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
    AppState: extract::FromRef<S>,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);
        let jar = CookieJar::from_request_parts(parts, &state).await.map_err(|_| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Cookie error"})))
        })?;

        let token = jar.get("auth_token")
            .map(|c| c.value())
            .ok_or((StatusCode::UNAUTHORIZED, Json(json!({"error": "Missing token"}))))?;

        let validation = Validation::default();
        let key = DecodingKey::from_secret(state.jwt_secret.as_bytes());

        let token_data = decode::<Claims>(token, &key, &validation)
            .map_err(|_| (StatusCode::UNAUTHORIZED, Json(json!({"error": "Invalid token"}))))?;

        Ok(AuthenticatedUser {
            id: token_data.claims.uid, 
            role: token_data.claims.role.to_string(),
            username: token_data.claims.sub,
        })
    }
}
