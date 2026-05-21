import { GraphQLID, GraphQLInt, GraphQLNonNull, GraphQLString } from "graphql";
import { genderType } from "./user.type";


export const getUserArgs = {
    id: { type: new GraphQLNonNull(GraphQLID) }
}

export const createUserArgs = {
    name: { type: new GraphQLNonNull(GraphQLString) },
    age: { type: new GraphQLNonNull(GraphQLInt) },
    gender: { type: new GraphQLNonNull(genderType) },
}