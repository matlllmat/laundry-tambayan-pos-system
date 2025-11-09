import React from "react";
import { Modal, Button } from "react-bootstrap";
import "./Modals.css";

interface CustomModalProps {
    show: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: "info" | "confirm" | "error" | "success";
}

const CustomModal: React.FC<CustomModalProps> = ({
    show,
    title,
    message,
    onClose,
    onConfirm,
    confirmText = "Yes",
    cancelText = "Cancel",
    type = "info",
}) => {
    const handleOkClick = () => {
        if (onConfirm) onConfirm();
            onClose();
    };

    return (
        <Modal show={show} onHide={onClose} centered>
            <Modal.Body className="error-modal p-4">
                <h5 className="fw-bold mb-2">{title}</h5>
                <p>{message}</p>

                {type === "confirm" ? (
                    <div className="d-flex gap-2 mt-3">
                        <Button className="w-50 ok-btn" onClick={onConfirm}>
                            {confirmText}
                        </Button>
                        <Button
                            className="w-50"
                            style={{ backgroundColor: "#6c757d", border: "none" }}
                            onClick={onClose}
                        >
                            {cancelText}
                        </Button>
                    </div>
                ) : (
                    <Button className="w-100 mt-3 ok-btn" onClick={handleOkClick}>
                        OK
                    </Button>
                )}
            </Modal.Body>
        </Modal>
    );
};
export default CustomModal;
