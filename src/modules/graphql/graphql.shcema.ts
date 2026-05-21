import { GraphQLObjectType, GraphQLSchema } from "graphql";
import UserFields from "../auth/graphql/user.fields";




const gql_schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: "que",
        description: "say hello, or Mohammed",
        fields: {
            ...UserFields.query()
            // ...PostFields.query()
        },
}),
    // mutation: new GraphQLObjectType({
    //     name: "mutation",
    //     fields: {
    //         ...UserFields.mutation()
    //     }
    // })
});

export default gql_schema