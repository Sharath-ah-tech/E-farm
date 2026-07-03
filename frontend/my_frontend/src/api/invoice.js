import api from "./axios";

/**
 * Downloads the invoice PDF as a blob and triggers a browser download.
 * No backend URL is ever opened in a new tab.
 *
 * @param {number} orderId
 * @returns {Promise<{ filename: string }>}
 */
export const downloadInvoice = async (orderId) => {
  const response = await api.get(`generate-bill/${orderId}/`, {
    responseType: "blob",
  });

  const filename = `Invoice_ORDER${orderId}.pdf`;
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url  = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href  = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { filename };
};