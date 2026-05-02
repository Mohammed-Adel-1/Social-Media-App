import multer from "multer"
import { multer_enum, store_enum } from "../enum/multer.enum";
import { tmpdir } from "node:os";
import { Request } from "express";



export const multerCloud = ({ 
    store_type = store_enum.memory, 
    custom_types = multer_enum.image,
    maxFileSize = 5 * 1024 * 1024
}: { 
    store_type?: store_enum, 
    custom_types?: string[],
    maxFileSize?: number
} = {}) => {

    const storage = store_type === store_enum.memory ? multer.memoryStorage() : multer.diskStorage({
        destination: tmpdir(),
        filename: (req: Request, file: Express.Multer.File, cb: Function) => {
            // console.log(file, "before");
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
            cb(null, uniqueSuffix + "_" + file.originalname)
        }

    });

    function fileFilter (req: Request, file: Express.Multer.File, cb: Function) {

    if(!custom_types.includes(file.mimetype)){
        cb(new Error("Invalid file type"))
    }
    cb(null, true)
}

    const upload = multer({ storage, fileFilter, limits: {fieldSize: maxFileSize } });
    return upload
}