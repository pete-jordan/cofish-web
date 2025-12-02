// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { User, Catch, InfoPurchase, KarmaEvent } = initSchema(schema);

export {
  User,
  Catch,
  InfoPurchase,
  KarmaEvent
};