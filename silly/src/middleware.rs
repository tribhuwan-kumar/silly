use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
    Json,
};
use axum_extra::extract::CookieJar;
use serde_json::json;
use jsonwebtoken::{decode, Validation, DecodingKey};
use crate::{AppState, auth::types::Claims};

/// Just check the cookie, gaurd ☕︎
pub async fn auth_guard(
    State(state): State<AppState>,
    jar: CookieJar,
    req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let tok = jar.get("auth_token")
        .map(|c| c.value())
        .ok_or((
            StatusCode::UNAUTHORIZED, 
            Json(json!({ "error": "Missing authentication cookie" }))
        ))?;

    let val = Validation::default();
    let key = DecodingKey::from_secret(state.jwt_secret.as_bytes());

    match decode::<Claims>(tok, &key, &val) {
        Ok(_) => {
            Ok(next.run(req).await)
        },
        Err(_) => {
            Err((
                StatusCode::UNAUTHORIZED, 
                Json(json!({ "error": "Invalid or expired token" }))
            ))
        }
    }
}

