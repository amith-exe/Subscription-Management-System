import '@prisma/client/runtime/library';

declare module '@prisma/client/runtime/library' {
  // Prisma 6.19.3 ships the runtime JavaScript file without this declaration
  // in this workspace. Keeping the deny list empty preserves the generated
  // transaction delegates while the runtime still enforces its own API.
  export type ITXClientDenyList = never;
}
