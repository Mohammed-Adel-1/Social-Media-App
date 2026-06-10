import { Server } from "socket.io";
import { Server as httpServer } from "http";
import redisService from "../../common/service/redis.service";
import { decodeToken_and_fetchUser } from "../../common/middleware/authentication";
import chatGateway from "../chat/realtime/chat.gateway";


class SocketGateway {

    constructor() { }

    initIo = async(httpServer: httpServer)=>{
        const io = new Server(httpServer, {
        cors: {
            origin: "*"
        }
    });

    io.use(async (socket, next) => {
        try {
            const { user } = await decodeToken_and_fetchUser(socket.handshake.auth.authorization)
            socket.data.user = user;
            next();
        } catch (error: any) {
            return next(error.message)
        }
    })


    io.on("connection", async (socket) => {
        // console.log({id: socket.id});
        
        
        await chatGateway.registerEvent(socket, io);
        


        await redisService.addSocket({ userId: socket.data.user._id, socketToken: socket.id });
        // console.log({ userSocketIds: await redisService.getSockets(socket.data.user._id) });
        socket.on("disconnect", async () => {
            await redisService.removeSocket({ userId: socket.data.user._id, socketToken: socket.id });
        })
    });
    }
}

export default new SocketGateway();