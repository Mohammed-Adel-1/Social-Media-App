import { HydratedDocument, Model, PopulateOptions, ProjectionType, QueryFilter, QueryOptions, Types, UpdateQuery } from "mongoose";



abstract class BaseRepository<TDocument> {

    constructor(protected readonly model: Model<TDocument>) {};

    async create(data: Partial<TDocument>): Promise<HydratedDocument<TDocument>> {
        return this.model.create(data);
    };

    async findById(id: Types.ObjectId): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findById(id);
    };

    async findOne({filter, projection}: {filter: QueryFilter<TDocument>, projection?: ProjectionType<TDocument>}): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOne(filter, projection);
    };

    async find({filter, projection, options}: {filter: QueryFilter<TDocument>, projection?: ProjectionType<TDocument>, options?: QueryOptions<TDocument>}): Promise<HydratedDocument<TDocument>[] | []> {
        return this.model.find(filter, projection)
        .sort(options?.sort)
        .skip(options?.skip!)
        .limit(options?.limit!)
        .populate(options?.populate as PopulateOptions)
    };

    async findByIdAndUpdate({id, update, options}: {id: Types.ObjectId, update: UpdateQuery<TDocument>, options?: QueryOptions<TDocument>}): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findByIdAndUpdate(id, update, { new: true, ...options});
    };

    async findOneAndUpdate({filter, update, options}: {filter: QueryFilter<TDocument>, update: UpdateQuery<TDocument>, options?: QueryOptions<TDocument>}): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOneAndUpdate(filter, update, { new: true, ...options});
    };

    async findOneAndDelete({filter, options}: {filter: QueryFilter<TDocument>, options?: QueryOptions<TDocument>}): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOneAndDelete(filter, options);
    };
}

export default BaseRepository;