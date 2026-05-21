import { graphql, GraphQLEnumType, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import { AppError } from "../../../common/utils/golbal.error.handler";
import { genderType, userType } from "./user.type";
import { createUserArgs, getUserArgs } from "./user.args";
import authService from "../auth.service";
import { authentication_gql } from "../../../common/middleware/authentication";
import { authorization_gql } from "../../../common/middleware/authorization";
import { validation_gql } from "../../../common/middleware/validation";



export class UserFields {

    constructor() { }

    query = () => {
        return {
            getUser: {
                type: userType,
                args: getUserArgs,
                resolve: async (parent: any, args: any, context: any) => {
                    const { user, decoded } = await authentication_gql(context.req.headers.authorization!);
                    await authorization_gql(["user", "admin"], user.role);

                    return authService.getuser(user._id);
                }
            },
            getUsers: {
                type: new GraphQLList(userType),
                resolve: (parent: any, args: any, context: any) => {
                    return authService.getUsers();
                }
            }
        }
    };

    mutation = () => {
        return {

        }
    }
}


export default new UserFields();