import { formatMoney } from '@/domain/money';
import type { TransferFailureCode } from '@/domain/transfer/failures';
import type { TransferViolation } from '@/domain/transfer/violations';

const APP_NAME = 'Wallet';

const pageTitle = (section: string) => `${section} · ${APP_NAME}`;

export const copy = {
  app: {
    name: APP_NAME,
    description: 'Flujo de cartera digital: login, saldo, movimientos y envío de dinero.',
    skipToContent: 'Saltar al contenido principal',
    loading: 'Cargando…',
    retry: 'Reintentar',
    back: 'Volver',
    backToHome: 'Volver al inicio',
  },

  titles: {
    login: pageTitle('Iniciar sesión'),
    home: pageTitle('Inicio'),
    transfer: pageTitle('Nueva transacción'),
    receipt: pageTitle('Comprobante'),
    notFound: pageTitle('Página no encontrada'),
  },

  login: {
    heading: APP_NAME,
    subtitle: 'Ingresa con tu email o teléfono para acceder a tu cartera digital.',
    handleLabel: 'Email o teléfono',
    handlePlaceholder: 'demo@wallet.com',
    submit: 'Ingresar',
    submitting: 'Ingresando…',
    failedTitle: 'No pudimos iniciar sesión',
    handleRequired: 'Ingresa tu email o teléfono.',
    handleInvalid: 'Ingresa un email o teléfono válido.',
  },

  home: {
    greeting: 'Hola,',
    signOut: 'Salir',
    balanceLabel: 'Saldo disponible',
    movementsTitle: 'Movimientos recientes',
    emptyTitle: 'Todavía no hay movimientos',
    emptyDescription: 'Cuando envíes o recibas dinero, tus movimientos aparecerán aquí.',
    newTransfer: 'Nueva transacción',
    pendingBadge: 'Pendiente',
    announceLoading: 'Cargando tu cartera digital…',
    announceError: 'No pudimos cargar tu cartera digital.',
    announceReady: (movements: number) => `Cartera digital actualizada. ${movements} movimientos.`,
  },

  transfer: {
    pageTitle: 'Nueva transacción',
    stepIndicator: (step: number, total: number) => `Paso ${step} de ${total}`,
    stepData: 'Datos',
    stepConfirm: 'Confirmar',
    amountLabel: 'Monto a enviar',
    amountPlaceholder: '0.00',
    available: (amount: string) => `Disponible: ${amount}`,
    recipientTitle: 'Destinatario',
    recipientTabsLabel: 'Tipo de destinatario',
    tabFavorites: 'Favoritos',
    tabManual: 'Nuevo contacto',
    favoriteLabel: 'Favorito',
    noContactsTitle: 'Sin contactos favoritos',
    noContactsDescription: 'Agrega un destinatario nuevo para empezar.',
    nameLabel: 'Nombre',
    namePlaceholder: 'Ana Pérez',
    handleLabel: 'Email o teléfono',
    handlePlaceholder: 'ana@example.com',
    saveContact: 'Guardar este contacto para próximas transferencias',
    noteLabel: 'Nota (opcional)',
    notePlaceholder: 'Cena del viernes',
    continue: 'Continuar',
    backToEdit: 'Volver a editar',
    preparingSummary: 'Preparando el resumen…',
  },

  review: {
    srHeading: 'Paso 2 de 2: revisa la transferencia',
    youWillSend: 'Vas a enviar',
    confirm: 'Confirmar transferencia',
    confirming: 'Enviando…',
    blockedHint: 'Modifica la transferencia antes de volver a intentar.',
  },

  receipt: {
    heading: 'Transferencia enviada',
    newTransfer: 'Nueva transferencia',
  },

  summary: {
    recipient: 'Para',
    destination: 'Destino',
    note: 'Nota',
    balanceAfter: 'Saldo después',
    balanceRemaining: 'Saldo restante',
    date: 'Fecha',
    reference: 'Referencia',
  },

  errors: {
    genericTitle: 'Algo salió mal',
    genericDescription: 'Ocurrió un error inesperado. Puedes reintentar o volver al inicio.',
    bootTitle: 'Algo salió mal',
    bootDescription: 'No pudimos cargar la aplicación. Intenta nuevamente.',
    notFoundTitle: 'No encontramos esta página',
    notFoundDescription: 'El enlace puede haber expirado o el comprobante ya no existe.',
  },

  api: {
    handleRequired: 'Ingresa un email o teléfono.',
    handleInvalid: 'Ingresa un email o teléfono válido.',
    loginFailed: 'No pudimos iniciar sesión en este momento. Intenta nuevamente.',
    userNotFound: 'Usuario no encontrado.',
    walletLoadFailed: 'No pudimos cargar tu cartera digital.',
    walletNotFound: 'No encontramos la cartera digital.',
    noSession: 'No active session.',
    badRequest: 'La solicitud es inválida.',
    invalidContact: 'Datos de contacto inválidos.',
    receiptNotFound: 'No encontramos el comprobante.',
    rulesRejected: 'La transferencia no cumple las reglas de negocio.',
    transferFailed: 'No pudimos completar la transferencia.',
    balanceChanged: 'Tu saldo cambió y ya no alcanza para esta transferencia.',
  },
} as const;

export function violationMessage(violation: TransferViolation): string {
  switch (violation.code) {
    case 'AMOUNT_REQUIRED':
      return 'Ingresa un monto.';
    case 'AMOUNT_INVALID':
      return 'El monto no es un número válido.';
    case 'AMOUNT_TOO_MANY_DECIMALS':
      return 'El monto admite como máximo 2 decimales.';
    case 'AMOUNT_NOT_POSITIVE':
      return 'El monto debe ser mayor a cero.';
    case 'AMOUNT_EXCEEDS_BALANCE':
      return `Saldo insuficiente. Tu saldo disponible es ${formatMoney(violation.available)}.`;
    case 'AMOUNT_ABOVE_LIMIT':
      return `El monto supera el límite por transacción de ${formatMoney(violation.limit)}.`;
    case 'RECIPIENT_REQUIRED':
      return 'Selecciona o ingresa un destinatario.';
    case 'RECIPIENT_INVALID':
      return 'Ingresa un email o teléfono válido.';
    case 'RECIPIENT_IS_SELF':
      return 'No puedes enviarte dinero a ti mismo.';
  }
}

export interface FailureCopy {
  readonly title: string;
  readonly description: string;
}

export function failureCopy(code: TransferFailureCode): FailureCopy {
  switch (code) {
    case 'NETWORK_ERROR':
      return {
        title: 'Error de red',
        description:
          'No pudimos comunicarnos con el servidor. Revisa tu conexión e intenta nuevamente.',
      };
    case 'TIMEOUT':
      return {
        title: 'La operación tardó demasiado',
        description:
          'El servidor no respondió a tiempo. Tu dinero no fue enviado. Puedes reintentar.',
      };
    case 'INSUFFICIENT_FUNDS':
      return {
        title: 'Fondos insuficientes',
        description:
          'Tu saldo disponible cambió y ya no alcanza para esta transferencia. Revisa el monto.',
      };
    case 'VALIDATION_FAILED':
      return {
        title: 'No pudimos validar la transferencia',
        description: 'Revisa el monto y el destinatario antes de volver a intentar.',
      };
    case 'UNAUTHORIZED':
      return {
        title: 'Tu sesión expiró',
        description: 'Inicia sesión nuevamente para continuar.',
      };
    case 'UNKNOWN_ERROR':
      return {
        title: 'Algo salió mal',
        description:
          'Ocurrió un error inesperado y no pudimos completar la operación. Intenta nuevamente.',
      };
  }
}
