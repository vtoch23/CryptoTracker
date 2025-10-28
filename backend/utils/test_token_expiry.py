from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

secret = os.getenv('SECRET_KEY')

# Create an expired token (expired 1 minute ago)
expired_token = jwt.encode({
    'sub': 1,
    'exp': datetime.utcnow() - timedelta(minutes=1)
}, secret, algorithm='HS256')

print('Testing JWT expiration...')
print(f'Expired token: {expired_token[:50]}...')

try:
    decoded = jwt.decode(expired_token, secret, algorithms=['HS256'])
    print('❌ ERROR: Token should have expired but was accepted!')
except JWTError as e:
    print(f'✅ SUCCESS: Token correctly expired - {type(e).__name__}: {str(e)}')

# Create a valid token
valid_token = jwt.encode({
    'sub': 1,
    'exp': datetime.utcnow() + timedelta(minutes=5)
}, secret, algorithm='HS256')

print(f'\nValid token: {valid_token[:50]}...')

try:
    decoded = jwt.decode(valid_token, secret, algorithms=['HS256'])
    print(f'✅ SUCCESS: Valid token accepted - user_id: {decoded.get("sub")}')
except JWTError as e:
    print(f'❌ ERROR: Valid token was rejected - {type(e).__name__}: {str(e)}')
