#!/usr/bin/env python3
"""
Quick test script to check what tokens are being generated
"""
from datetime import datetime, timedelta
from jose import jwt
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY')
ACCESS_TOKEN_EXPIRE_MINUTES = 1
ALGORITHM = "HS256"

# Test 1: Wrong way (what might be happening)
print("=" * 60)
print("TEST 1: WRONG WAY (using timedelta directly)")
print("=" * 60)
try:
    expire_wrong = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data_wrong = {"sub": 1, "exp": expire_wrong}
    token_wrong = jwt.encode(token_data_wrong, SECRET_KEY, algorithm=ALGORITHM)
    print(f"Token created: {token_wrong[:50]}...")

    # Decode it
    decoded = jwt.decode(token_wrong, SECRET_KEY, algorithms=[ALGORITHM])
    print(f"Decoded exp value: {decoded['exp']}")
    exp_date = datetime.fromtimestamp(decoded['exp'])
    print(f"Expires at: {exp_date}")
except Exception as e:
    print(f"Error: {e}")

print()

# Test 2: Correct way
print("=" * 60)
print("TEST 2: CORRECT WAY (using datetime.utcnow())")
print("=" * 60)
expire_correct = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
token_data_correct = {"sub": 1, "exp": expire_correct}
token_correct = jwt.encode(token_data_correct, SECRET_KEY, algorithm=ALGORITHM)
print(f"Token created: {token_correct[:50]}...")

# Decode it
decoded = jwt.decode(token_correct, SECRET_KEY, algorithms=[ALGORITHM])
print(f"Decoded exp value: {decoded['exp']}")
exp_date = datetime.fromtimestamp(decoded['exp'])
print(f"Expires at: {exp_date}")
print(f"Current time: {datetime.now()}")
print(f"Time until expiration: {(exp_date - datetime.now()).total_seconds()} seconds")

print()
print("=" * 60)
print("Now test with your actual create_access_token function:")
print("=" * 60)

# Import the actual function
import sys
sys.path.insert(0, '/Users/Vanya/Development/CryptoTracker/backend')
from app.auth import create_access_token

# Create a token
actual_token = create_access_token(data={"sub": 1})
print(f"Actual token: {actual_token[:50]}...")

# Decode it
decoded_actual = jwt.decode(actual_token, SECRET_KEY, algorithms=[ALGORITHM])
print(f"Decoded exp value: {decoded_actual['exp']}")
exp_date_actual = datetime.fromtimestamp(decoded_actual['exp'])
print(f"Expires at: {exp_date_actual}")
print(f"Current time: {datetime.now()}")
print(f"Time until expiration: {(exp_date_actual - datetime.now()).total_seconds()} seconds")

if (exp_date_actual - datetime.now()).total_seconds() > 120:
    print("ERROR: Token expires more than 2 minutes from now!")
else:
    print("SUCCESS: Token expires within expected time!")
