import { Server, Socket } from "socket.io";
import chatEvent from "./chat.event";


class ChatGateway {

    constructor() { } 


    registerEvent = async (socket: Socket, io: Server)=>{
        // await chatEvent.sayHi(socket);
        await chatEvent.sendMessage(socket, io);
        await chatEvent.join_room(socket, io);
        await chatEvent.sendGroupMessage(socket, io);
    }

}


export default new ChatGateway();