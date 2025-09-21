// This file contains constants for order status used in the backend

export const ORDER_STATUS = {
  NOT_PROCESSED: "Not Processed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_OPTIONS = [
  ORDER_STATUS.NOT_PROCESSED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
];

export default {
  ORDER_STATUS,
  ORDER_STATUS_OPTIONS,
};
