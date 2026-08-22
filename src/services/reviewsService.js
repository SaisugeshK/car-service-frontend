import { createCrudService } from './crudServiceFactory';

export const reviewsService = createCrudService('/reviews', 'reviewId');
export default reviewsService;
