import type { UserDocument } from "./user.model"
import type { PublicUser } from "./user.types"

export const toPublicUser = (user: UserDocument): PublicUser => {
  return {
    id: user._id.toString(),
    email: user.email,
    ...(user.name ? { name: user.name } : {}),
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    ...(user.emailVerifiedAt ? { emailVerifiedAt: user.emailVerifiedAt } : {}),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
