from pydantic import BaseModel, EmailStr, SecretStr


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: SecretStr
    password: SecretStr
    password_confirmation: SecretStr


class PasswordResetMessage(BaseModel):
    message: str
