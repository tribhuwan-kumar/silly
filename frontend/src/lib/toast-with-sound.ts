import { toast } from "sonner";
import {
  playSuccessSound,
  playErrorSound,
  playWarningSound,
  playInfoSound,
} from "./audio";
import { logger } from "./logger";
import { getSettings } from "./settings";
const toastStyle = {
  className: "font-mono lowercase",
};
const isSfxEnabled = () => getSettings().sfxEnabled;
export const toastWithSound = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  success: (message: string, data?: any) => {
    const msg = message.toLowerCase();
    logger.success(msg);
    if (isSfxEnabled()) playSuccessSound();
    return toast.success(msg, { ...toastStyle, ...data });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (message: string, data?: any) => {
    const msg = message.toLowerCase();
    logger.error(msg);
    if (isSfxEnabled()) playErrorSound();
    return toast.error(msg, { ...toastStyle, ...data });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warning: (message: string, data?: any) => {
    const msg = message.toLowerCase();
    logger.warning(msg);
    if (isSfxEnabled()) playWarningSound();
    return toast.warning(msg, { ...toastStyle, ...data });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (message: string, data?: any) => {
    const msg = message.toLowerCase();
    logger.info(msg);
    if (isSfxEnabled()) playInfoSound();
    return toast.info(msg, { ...toastStyle, ...data });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: (message: string, data?: any) => {
    const msg = message.toLowerCase();
    logger.info(msg);
    if (isSfxEnabled()) playInfoSound();
    return toast(msg, { ...toastStyle, ...data });
  },
};
