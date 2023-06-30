import Arweave from "arweave";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Box, Text, Button } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { window } from "global";

const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
});

const EncryptFile = () => {
    const [file, setFile] = useState(null);
    const { getRootProps, getInputProps } = useDropzone({
        accept: ["image/*", ".doc", ".docx", ".pdf"],
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length === 1) {
                setFile(acceptedFiles[0]);
            } else {
                alert("Please drop only 1 file at a time.");
            }
        },
    });

    const handleUpload = useCallback(async () => {
        if (file) {
            try {
                const reader = new FileReader();
                reader.readAsArrayBuffer(file);
                reader.onload = async () => {
                    const buffer = new Uint8Array(reader.result);

                    try {
                        // Server-side validation can be performed here before processing the file

                        const encryptionSecretKey = process.env.ENCRYPTION_SECRET_KEY;

                        const encryptedBuffer = await encrypt(buffer, encryptionSecretKey);

                        const transaction = await arweave.createTransaction({
                            data: encryptedBuffer,
                        });
                        transaction.addTag("Content-Type", file.type);

                        // Add additional tags if required
                        transaction.addTag("Encrypted", "true");

                        await arweave.transactions.sign(transaction);
                        let uploader = await arweave.transactions.getUploader(transaction);
                        while (!uploader.isComplete) {
                            await uploader.uploadChunk();
                            console.log(
                                `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
                            );
                        }

                        setFile(null);
                        alert(
                            "Upload Successful. Please allow several minutes for the transaction to finalize."
                        );
                    } catch (error) {
                        console.error("Upload Error:", error);
                        alert("An error occurred during file upload. Please try again.");
                    }
                };

                reader.onerror = () => {
                    console.error("File Read Error:", reader.error);
                    alert("An error occurred while reading the file. Please try again.");
                };
            } catch (error) {
                console.error("File Read Error:", error);
                alert("An error occurred while reading the file. Please try again.");
            }
        } else {
            alert("No file selected.");
        }
    }, [file]);

    const buttonVariants = {
        hover: {
            scale: 1.1,
            transition: { duration: 0.3 },
        },
    };

    const encrypt = async (buffer, encryptionSecretKey) => {
        const key = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(encryptionSecretKey),
            {
                name: "AES-CTR",
                length: 256,
            },
            false,
            ["encrypt"]
        );

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: "AES-CTR",
                counter: new Uint8Array(16),
                length: 64,
            },
            key,
            buffer
        );

        return encryptedBuffer;
    };

    return (
        <Box
            bg="#8e68fc"
            minHeight="100vh"
            display="flex"
            justifyContent="center"
            alignItems="center"
        >
            {file ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Box p={8} bg="white" borderRadius="md" textAlign="center">
                        <Text fontSize="xl" fontWeight="bold" mb={4}>
                            Filename: {file.name}
                        </Text>
                        <Text fontSize="xl" fontWeight="bold" mb={4}>
                            File Type: {file.type}
                        </Text>
                        <Text fontSize="xl" fontWeight="bold" mb={4}>
                            Size: {file.size} bytes
                        </Text>
                        <motion.button
                            variants={buttonVariants}
                            whileHover="hover"
                            colorScheme="purple"
                            onClick={handleUpload}
                            mt={4}
                        >
                            Upload to Arweave
                        </motion.button>
                    </Box>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="dropzone"
                    {...getRootProps()}
                >
                    <input {...getInputProps()} />
                    <Text color="white" fontSize="xl" fontWeight="bold" mb={4}>
                        Drag & Drop an Image or Document Here
                    </Text>
                    <Button colorScheme="purple" size="lg">
                        Or click to Select a File
                    </Button>
                </motion.div>
            )}
        </Box>
    );
};

export default EncryptFile;

