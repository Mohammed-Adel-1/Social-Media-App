import nodemailer from 'nodemailer';
import { EMAIL, EMAIL_PASS } from '../../../config/config.service';
import Mail from 'nodemailer/lib/mailer';

export const sendEmail = async (mailOptions: Mail.Options)=> {

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: EMAIL,
            pass: EMAIL_PASS
        },
    });


    const info = await transporter.sendMail({
        from: `Mohammed Adel <${EMAIL}>`,
        ...mailOptions
    });

    console.log("Message sent", info.messageId);

    return info.accepted.length > 0 ? true : false
};

export const generateOTP = async ()=> {
    return Math.floor(Math.random() * 900000 + 100000);
}