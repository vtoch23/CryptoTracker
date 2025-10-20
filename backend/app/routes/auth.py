from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from app import models, schemas, auth, dependencies
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

@router.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(dependencies.get_db)):
    """Register a new user"""
    db_user = db.query(models.User).filter(models.User.email == user.email.lower()).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if len(user.password.encode('utf-8')) > 72:
        raise HTTPException(status_code=400, detail="Password cannot exceed 72 bytes. Please shorten it.")
    
    if len(user.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email.lower(), hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(dependencies.get_db)):
    """Login and get access token"""
    user = db.query(models.User).filter(models.User.email == form_data.username.lower()).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email")
    
    if len(form_data.password.encode('utf-8')) > 72:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Password cannot exceed 72 bytes. Please try again.")
    
    if not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}