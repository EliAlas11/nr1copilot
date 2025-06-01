from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.schemas import UserCreate, UserLogin, Token, TokenPayload
from app.services.user_service import get_user_by_email, create_user
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = settings.JWT_SECRET
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(email: str, password: str):
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def signup_service(user_in: UserCreate):
    user = get_user_by_email(user_in.email)
    if user:
        return {"error": "User already exists"}
    hashed_password = get_password_hash(user_in.password)
    user = create_user(email=user_in.email, full_name=user_in.full_name, hashed_password=hashed_password)
    return {"message": "User signed up", "user": user}

def login_service(user_in: UserLogin):
    user = authenticate_user(user_in.email, user_in.password)
    if not user:
        return {"error": "Invalid credentials"}
    access_token = create_access_token({"sub": user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}

def refresh_token_service(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return {"error": "Invalid token"}
        new_token = create_access_token({"sub": user_id})
        return {"access_token": new_token, "token_type": "bearer"}
    except JWTError:
        return {"error": "Invalid token"}
