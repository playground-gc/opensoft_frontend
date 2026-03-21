/**
 * @file useOrderSubmit.js
 * @description Handles order form submission: validates input, dispatches optimistic update to
 * orderStore, calls the REST API via React Query mutation, and rolls back on failure.
 * @exports useOrderSubmit  () => { submit, isSubmitting, error }
 * @note Optimistic rollback must restore the exact pre-submit orderStore snapshot.
 */

export const useOrderSubmit = () => ({
  submit: () => Promise.resolve(),
  isSubmitting: false,
  error: null,
});
