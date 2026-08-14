import { z } from 'zod';

export const handleSchema = z.string().trim().min(1, 'required').max(120);

export const loginRequestSchema = z.object({
  handle: handleSchema,
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const recipientSchema = z.object({
  contactId: z.string().nullable(),
  name: z.string().trim().min(1).max(80),
  handle: handleSchema,
});

export const createTransferRequestSchema = z.object({
  amountInput: z.string().max(32),
  recipient: recipientSchema,
  note: z.string().max(140).default(''),
  saveRecipient: z.boolean().default(false),
});
export type CreateTransferRequest = z.input<typeof createTransferRequestSchema>;

export const createContactRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  handle: handleSchema,
  isFavorite: z.boolean().default(false),
});
export type CreateContactRequest = z.input<typeof createContactRequestSchema>;

export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly violations?: readonly unknown[];
  };
}
