from db.session import engine, SessionLocal
from db.models import User
from services.auth import create_access_token, get_password_hash

def main():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "admin").first()
    if not user:
        user = User(username="admin", password=get_password_hash("password"))
        db.add(user)
        db.commit()
    
    token = create_access_token({"sub": "admin"})
    with open("temp_token.txt", "w") as f:
        f.write(token)
    print("TOKEN GENERATED")

if __name__ == "__main__":
    main()
