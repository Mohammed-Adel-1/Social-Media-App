import { HydratedDocument, Model, PopulateOptions, ProjectionType, QueryFilter, QueryOptions, Types, UpdateQuery } from "mongoose";



abstract class BaseRepository<TDocument> {

    constructor(protected readonly model: Model<TDocument>) {};

    async create(data: Partial<TDocument>): Promise<HydratedDocument<TDocument>> {
        return this.model.create(data);
    };

    async findById(id: Types.ObjectId): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findById(id);
    };

    async findOne({filter, projection, options}: {filter: QueryFilter<TDocument>, projection?: ProjectionType<TDocument>, options?: QueryOptions<TDocument>}): Promise<HydratedDocument<TDocument> | null> {
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

    async findByIdAndDelete({id, options}: {id: Types.ObjectId, options?: QueryOptions<TDocument>}): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findByIdAndDelete(id, options);
    };

    async paginate<T>({
        page,
        limit,
        sort,
        populate,
        search,
    }: {
        page?: number,
        limit?: number,
        sort?: any,
        populate?: any,
        search?: QueryFilter<T>,
    }) {
        page = +page! || 1;
        limit = +limit! || 3;

        if(page<1) page = 1;
        if(limit<1) limit = 3;

        const skip = (page - 1) * limit;

        const [data, totalDocs] = await Promise.all([
            await this.model.find(search).limit(limit).skip(skip).sort(sort).populate(populate).exec(),
            await this.model.countDocuments(search)
        ]);

        const totalPages = Math.ceil(totalDocs / limit);

        return {
            meta: {
                currentPage: page,
                limit,
                totalPages,
                totalDocs
            },
            data
        }

    }
}

export default BaseRepository;