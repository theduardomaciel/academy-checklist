// Shared Tailwind utility strings so buttons/cards look identical everywhere.

export const CARD = 'rounded-lg border border-border bg-surface p-5 shadow-sm'

export const BTN_BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-5 py-3 text-[15px] font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

export const BTN_PRIMARY = `${BTN_BASE} bg-accent text-accent-contrast shadow-sm hover:shadow-md`

export const BTN_PRIMARY_BLOCK = `${BTN_PRIMARY} w-full`

export const BTN_SECONDARY = `${BTN_BASE} border border-border bg-transparent text-text hover:bg-surface-raised`

export const BTN_GHOST = 'inline-flex cursor-pointer items-center bg-transparent p-2 px-2.5 text-inherit'

export const APP_MAIN = 'w-full max-w-[640px] flex-1 px-4 pb-24 pt-5 mx-auto'

export const CENTERED_SHELL = 'flex flex-1 items-center justify-center p-6'

export const PAGE_TITLE = 'mb-1 text-[22px] font-extrabold text-text m-0'

export const PAGE_SUBTITLE = 'mb-5 mt-0 text-sm text-text-muted'

export const FORM_ERROR = 'mb-3.5 rounded-sm bg-danger-bg px-3 py-2.5 text-[13px] text-danger'

export const LIST_NAV =
  'fixed inset-x-0 bottom-0 z-10 flex justify-center gap-2 border-t border-border bg-surface px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]'

export const INPUT =
  'w-full rounded-sm border border-border bg-surface px-3.5 py-3 text-[15px] text-text focus:border-accent focus:outline-none'

export const FIELD_LABEL = 'mb-1.5 block text-[13px] font-semibold text-text-muted'
