export const LOCALES = {
  en: {
    success: {
      operationCompleted: "Operation completed successfully.",
      requestAuthorized: "Request authorized and processed.",
      dataSaved: "Data saved successfully.",
      actionExecuted: "Action executed successfully.",
      submissionSuccessful: "Submission successful.",
    },
    error: {
      authenticationFailed: "Authentication failed. Invalid or expired token.",
      authorizationDenied: "Authorization denied. You do not have permission.",
      generic: "An error occurred. Please try again.",
      unableToProcess: "Unable to process your request at the moment.",
      submissionFailed: "Submission failed. Please check your input.",
    },
  },
};

export const DEFAULT_LOCALE = "en";

export const getMessage = (type, key, locale = DEFAULT_LOCALE) => {
  return (
    LOCALES[locale]?.[type]?.[key] ||
    LOCALES[DEFAULT_LOCALE]?.[type]?.[key] ||
    LOCALES[DEFAULT_LOCALE].error.generic
  );
};

