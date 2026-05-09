import { Bucket$, DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, ObjectCannedACL, PutObject$, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AWS_ACCESS_KEY, AWS_BUCKET_NAME, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "../../config/config.service";
import { randomUUID } from "node:crypto";
import { store_enum } from "../enum/multer.enum";
import fs from "node:fs";
import { AppError } from "../utils/golbal.error.handler";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


export class S3Service {
    private client: S3Client

    constructor() {
        this.client = new S3Client({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY,
                secretAccessKey: AWS_SECRET_ACCESS_KEY
            }
        })
    }


    async uploadFile({
        store_type = store_enum.memory,
        file,
        path = "General",
        ACL = ObjectCannedACL.private
    }: {
        store_type?: store_enum,
        file: Express.Multer.File
        path?: string,
        ACL?: ObjectCannedACL
    }): Promise<string> {

        const command = new PutObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            ACL,
            Key: `social-media-app/${path}/${randomUUID()}__${file.originalname}`,
            Body: store_type === store_enum.memory ? file.buffer : fs.createReadStream(file.path),
            ContentType: file.mimetype
        })
        if (!command.input.Key) {
            throw new AppError("Failed to upload file");
        }
        await this.client.send(command);
        return command.input.Key;
    }

    async uploadLargeFile({
        store_type = store_enum.memory,
        file,
        path = "General",
        ACL = ObjectCannedACL.private
    }: {
        store_type?: store_enum,
        file: Express.Multer.File
        path?: string,
        ACL?: ObjectCannedACL
    }): Promise<string> {
        const command = new Upload({
            client: this.client,
            params: {
                Bucket: AWS_BUCKET_NAME,
                ACL,
                Key: `social-media-app/${path}/${randomUUID()}__${file.originalname}`,
                Body: store_type === store_enum.memory ? file.buffer : fs.createReadStream(file.path),
                ContentType: file.mimetype
            }
        })

        const result = await command.done();
        command.on("httpUploadProgress", (progress) => {
            console.log(progress);
        })
        return result.Key as string;
    }

    async uploadFiles({
        store_type = store_enum.memory,
        files,
        path = "General",
        ACL = ObjectCannedACL.private,
        isLarge = false
    }: {
        store_type?: store_enum,
        files: Express.Multer.File[],
        path?: string,
        ACL?: ObjectCannedACL,
        isLarge?: boolean
    }) {
        let keys = [];

        if (isLarge) {
            keys = await Promise.all(files.map(file => {
                return this.uploadLargeFile({ file, store_type, path, ACL })
            }))
        } else {
            keys = await Promise.all(files.map(file => {
                return this.uploadFile({ file, store_type, path, ACL })
            }))
        }

        return keys;
    }

    async createPreSignedUrl({
        path,
        fileName,
        ContentType,
        expiresIn = 60
    }: {
        path: string,
        fileName: string,
        ContentType: string,
        expiresIn: number
    }) {

        const Key = `social-media-app/${path}/${randomUUID()}__${fileName}`
        const command = new PutObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key,
            ContentType
        })

        const url = await getSignedUrl(this.client, command, { expiresIn });
        return { url, Key }
    }

    async getFile(Key: string) {
        const command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key
        })

        return await this.client.send(command);
    }

    async getPreSignedUrl({
        Key,
        expiresIn = 60,
        download = "false"
    }: {
        Key: string,
        expiresIn?: number,
        download: string | undefined
    }) {

        const command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key,
            ResponseContentDisposition: download ? `attachment; filename="${Key.split("/").pop()}"` : undefined
        })

        const url = await getSignedUrl(this.client, command, { expiresIn });
        return url
    }

    async getFiles(folderName: string) {
        const command = new ListObjectsV2Command({
            Bucket: AWS_BUCKET_NAME,
            Prefix: `social-media-app/${folderName}`
        })

        return await this.client.send(command);
    }

    async deleteFile(Key: string) {
        const command = new DeleteObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key
        })

        return await this.client.send(command);
    }

    async deleteFiles(Keys: string[]) {

        const keysMapped = Keys.map((k)=>{
            return {Key:k};
        })
        const command = new DeleteObjectsCommand({
            Bucket: AWS_BUCKET_NAME,
            Delete:{
                Objects: keysMapped
            }
        })

        return await this.client.send(command);
    }

    async deleteFolder(folderName: string) {
        const data = await this.getFiles(folderName);

        const keysMapped = data.Contents?.map((k)=>{
            return k.Key;
        });

        return await this.deleteFiles(keysMapped as string[])
    }

}