import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled, AsyncCollection, AsyncItem } from "@aws-amplify/datastore";





type EagerUser = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<User, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly email: string;
  readonly displayName?: string | null;
  readonly pointsBalance: number;
  readonly createdAt?: string | null;
  readonly expoPushToken?: string | null;
  readonly catches?: (Catch | null)[] | null;
  readonly purchases?: (InfoPurchase | null)[] | null;
  readonly updatedAt?: string | null;
}

type LazyUser = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<User, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly email: string;
  readonly displayName?: string | null;
  readonly pointsBalance: number;
  readonly createdAt?: string | null;
  readonly expoPushToken?: string | null;
  readonly catches: AsyncCollection<Catch>;
  readonly purchases: AsyncCollection<InfoPurchase>;
  readonly updatedAt?: string | null;
}

export declare type User = LazyLoading extends LazyLoadingDisabled ? EagerUser : LazyUser

export declare const User: (new (init: ModelInit<User>) => User) & {
  copyOf(source: User, mutator: (draft: MutableModel<User>) => MutableModel<User> | void): User;
}

type EagerCatch = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Catch, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly user?: User | null;
  readonly createdAt: string;
  readonly species?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly videoKey?: string | null;
  readonly thumbnailKey?: string | null;
  readonly basePoints: number;
  readonly karmaPoints: number;
  readonly verificationStatus: string;
  readonly updatedAt?: string | null;
}

type LazyCatch = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Catch, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly user: AsyncItem<User | undefined>;
  readonly createdAt: string;
  readonly species?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly videoKey?: string | null;
  readonly thumbnailKey?: string | null;
  readonly basePoints: number;
  readonly karmaPoints: number;
  readonly verificationStatus: string;
  readonly updatedAt?: string | null;
}

export declare type Catch = LazyLoading extends LazyLoadingDisabled ? EagerCatch : LazyCatch

export declare const Catch: (new (init: ModelInit<Catch>) => Catch) & {
  copyOf(source: Catch, mutator: (draft: MutableModel<Catch>) => MutableModel<Catch> | void): Catch;
}

type EagerInfoPurchase = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<InfoPurchase, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly user?: User | null;
  readonly createdAt: string;
  readonly centerLat: number;
  readonly centerLng: number;
  readonly radiusMiles: number;
  readonly speciesFilter?: string | null;
  readonly baseCostPoints: number;
  readonly discountPercent: number;
  readonly finalCostPoints: number;
  readonly avgAgeHours?: number | null;
  readonly includedCatchIds?: (string | null)[] | null;
  readonly updatedAt?: string | null;
}

type LazyInfoPurchase = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<InfoPurchase, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly userId: string;
  readonly user: AsyncItem<User | undefined>;
  readonly createdAt: string;
  readonly centerLat: number;
  readonly centerLng: number;
  readonly radiusMiles: number;
  readonly speciesFilter?: string | null;
  readonly baseCostPoints: number;
  readonly discountPercent: number;
  readonly finalCostPoints: number;
  readonly avgAgeHours?: number | null;
  readonly includedCatchIds?: (string | null)[] | null;
  readonly updatedAt?: string | null;
}

export declare type InfoPurchase = LazyLoading extends LazyLoadingDisabled ? EagerInfoPurchase : LazyInfoPurchase

export declare const InfoPurchase: (new (init: ModelInit<InfoPurchase>) => InfoPurchase) & {
  copyOf(source: InfoPurchase, mutator: (draft: MutableModel<InfoPurchase>) => MutableModel<InfoPurchase> | void): InfoPurchase;
}

type EagerKarmaEvent = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<KarmaEvent, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly helperUserId: string;
  readonly beneficiaryUserId: string;
  readonly sourceCatchId: string;
  readonly beneficiaryCatchId: string;
  readonly points: number;
  readonly createdAt: string;
  readonly updatedAt?: string | null;
}

type LazyKarmaEvent = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<KarmaEvent, 'id'>;
    readOnlyFields: 'updatedAt';
  };
  readonly id: string;
  readonly helperUserId: string;
  readonly beneficiaryUserId: string;
  readonly sourceCatchId: string;
  readonly beneficiaryCatchId: string;
  readonly points: number;
  readonly createdAt: string;
  readonly updatedAt?: string | null;
}

export declare type KarmaEvent = LazyLoading extends LazyLoadingDisabled ? EagerKarmaEvent : LazyKarmaEvent

export declare const KarmaEvent: (new (init: ModelInit<KarmaEvent>) => KarmaEvent) & {
  copyOf(source: KarmaEvent, mutator: (draft: MutableModel<KarmaEvent>) => MutableModel<KarmaEvent> | void): KarmaEvent;
}