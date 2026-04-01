import smtplib
from email.message import EmailMessage
from config import Config

def send_setup_email(recipient_email, first_name, setup_link):
    if not Config.MAIL_SERVER or not Config.MAIL_USERNAME or not Config.MAIL_PASSWORD:
        raise RuntimeError("Email settings missing in config.")

    subject = "Set up your admin account"
    text_body = (
        f"Hello {first_name},\n\n"
        "Your admin registration has been approved.\n"
        "Use the link below to set your account username and password:\n\n"
        f"{setup_link}\n\n"
        "This link expires in 24 hours.\n"
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = Config.MAIL_DEFAULT_SENDER
    message["To"] = recipient_email
    message.set_content(text_body)

    if Config.MAIL_USE_SSL:
        with smtplib.SMTP_SSL(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
            server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
            server.send_message(message)
    else:
        with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
            if Config.MAIL_USE_TLS:
                server.starttls()
            server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
            server.send_message(message)