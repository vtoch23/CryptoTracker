from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from app import models, schemas, auth, dependencies
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

# Dependency for authenticated user
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

@router.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(dependencies.get_db)):
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
    user = db.query(models.User).filter(models.User.email == form_data.username.lower()).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email")
    if len(form_data.password.encode('utf-8')) > 72:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Password cannot exceed 72 bytes. Please try again.")
    if not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

# add-to-watchlist POST endpoint
@router.post("/add-to-watchlist", response_model=schemas.WatchlistItemOut)
def add_to_watchlist(watchlist_item: schemas.WatchlistItemCreate, db: Session = Depends(dependencies.get_db), token: str = Depends(oauth2_scheme)):
    current_user = auth.get_current_user_from_token(token, db)
    new_watchlist_item = models.WatchlistItem(
        user_id=current_user.id,
        symbol=watchlist_item.symbol.upper(),
        target_price=watchlist_item.target_price,
        created_at=datetime.utcnow()
    )
    db.add(new_watchlist_item)
    db.commit()
    db.refresh(new_watchlist_item)
    return new_watchlist_item

# watchlist GET endpoint
@router.get("/watchlist", response_model=list[schemas.WatchlistItemOut])
def get_watchlist(db: Session = Depends(dependencies.get_db), token: str = Depends(oauth2_scheme)):
    current_user = auth.get_current_user_from_token(token, db)
    watchlist_items = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == current_user.id).all()
    if not watchlist_items:
        raise HTTPException(status_code=404, detail="Watchlist is empty")
    return watchlist_items