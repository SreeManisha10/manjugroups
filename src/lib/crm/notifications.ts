import Swal from "sweetalert2";

const base = {
  buttonsStyling: false,
  background: "hsl(212 40% 100% / 0.96)",
  backdrop: "rgba(15, 23, 42, 0.28)",
  showClass: { popup: "animate-rise" },
  hideClass: { popup: "swal-hide" },
  customClass: {
    popup: "swal-popup",
    confirmButton: "swal-confirm",
    cancelButton: "swal-cancel",
  },
};

export function notifySuccess(title: string, text?: string) {
  return Swal.fire({
    ...base,
    icon: "success",
    title,
    text,
    timer: 2200,
    timerProgressBar: true,
    showConfirmButton: false,
  });
}

export function notifyError(title: string, text?: string) {
  return Swal.fire({ ...base, icon: "error", title, text, confirmButtonText: "Close" });
}

export function confirmAction(title: string, text: string) {
  return Swal.fire({
    ...base,
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Confirm",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    focusCancel: true,
  });
}
