import { graphql, GraphQLEnumType, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";

export let genderType = new GraphQLEnumType({
    name: "genderType",
    values: {
        male: { value: "male" },
        female: { value: "female" },
    }
})

export let userType = new GraphQLObjectType({
    name: "User",
    fields: {
        _id: { type: GraphQLID },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
        email: { type: GraphQLString },
        phone: { type: GraphQLString },
        profilePic: { type: GraphQLString },
        age: { type: GraphQLInt },
        gender: { type: genderType },
    }
})