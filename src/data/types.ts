import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
} from 'firebase/firestore'

export type ItemKind = 'buy' | 'do'
export type ItemStatus = 'pending' | 'done' | 'closed'
export type HistoryKind = 'purchase' | 'archive'

export interface Member {
  displayName: string
  photoURL: string | null
}

export interface UserDoc {
  id: string
  displayName: string
  photoURL: string | null
  defaultStoreId: string
  lastListId?: string | null
  createdAt: Timestamp
  notificationsReadAt?: Timestamp
  driveFolderId?: string
}

export interface CategoryDoc {
  id: string
  name: string
  icon: string
  color: string
  order: number
}

export interface StoreDoc {
  id: string
  name: string
  createdAt: Timestamp
}

export interface ListPrefsDoc {
  id: string
  categoryId?: string | null
  lastTab: ItemKind
  lastSeenAt?: Timestamp
}

export interface ListDoc {
  id: string
  name: string
  ownerId: string
  memberIds: string[]
  members: Record<string, Member>
  createdAt: Timestamp
  joinToken?: string
}

export interface InviteDoc {
  id: string
  createdBy: string
  createdAt: Timestamp
  expiresAt: Timestamp
  usedBy?: string
  usedAt?: Timestamp
  revoked?: boolean
  listName: string
  ownerName: string
  ownerPhotoURL: string | null
}

export interface ItemDoc {
  id: string
  kind: ItemKind
  name: string
  normalizedName: string
  quantity?: string
  storeName?: string | null
  note?: string
  status: ItemStatus
  historyId?: string
  addedBy: string
  addedByName: string
  doneBy?: string
  doneByName?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface HistoryItem {
  itemId: string
  kind: ItemKind
  name: string
  quantity?: string
  storeName?: string | null
  note?: string
  addedByName: string
  doneByName: string
  prevLastPurchasedAt: Timestamp | null
}

export interface HistoryEntryDoc {
  id: string
  kind: HistoryKind
  closedAt: Timestamp
  closedBy: string
  closedByName: string
  activityId?: string
  items: HistoryItem[]
}

export type ActivityType = 'added' | 'done' | 'closed' | 'archived' | 'deleted' | 'joined' | 'left'

export interface ActivityDoc {
  id: string
  type: ActivityType
  actorUid: string
  actorName: string
  at: Timestamp
  itemName?: string
  count?: number
  historyId?: string
}

export interface ProductDoc {
  id: string
  name: string
  lastStoreName?: string | null
  lastPurchasedAt?: Timestamp | null
  timesPurchased: number
}

/**
 * Convertidor que agrega el id del documento al leer y lo quita al escribir.
 * Las fechas de servidor aún sin confirmar (sin señal o en camino) se leen
 * estimadas en vez de null, así la UI puede ordenar por ellas.
 */
export function withId<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data) {
      const { id: _id, ...rest } = data as T
      return rest as DocumentData
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions) {
      return { id: snapshot.id, ...snapshot.data({ ...options, serverTimestamps: 'estimate' }) } as T
    },
  }
}
