import admin from 'firebase-admin';
import { resolve } from 'node:path';
import  { readFileSync } from "node:fs";


class NotificationService {


    private readonly client: admin.app.App


    constructor() {

        const serviceAccount = JSON.parse(readFileSync(resolve(__dirname, '..//../config/social-app-6dc5d-firebase-adminsdk-fbsvc-196d8cb7e5.json')) as unknown as string);

        this.client = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

    }

    async sendNotification({
        token,
        data
    }: {
        token: string,
        data: { title: string, body: string }
    }) {
        const message = {
            token,
            data
        }

        return this.client.messaging().send(message)
    }

    async sendNotifications({
        tokens,
        data
    }: {
        tokens: string[],
        data: { title: string, body: string }
    }) {
        const message = {
            tokens,
            data
        }

        await Promise.all(tokens.map((token) => {
            return this.sendNotification({ token, data });
        }))
    }
}

export default new NotificationService();