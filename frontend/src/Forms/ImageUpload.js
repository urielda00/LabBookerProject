import React, { useState } from "react";
import api from "../utils/axiosConfig"; // Import the centralized Axios instance

const ImageUpload = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // State for success message

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
    setError(null); // Clear error when a new file is selected
    setSuccess(null); // Clear success message when a new file is selected
  };

  const handleImageUpload = async () => {
    if (!image) {
      setError("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);

    setLoading(true);
    setError(null);
    setSuccess(null); // Clear any previous success message

    try {
      const res = await api.post(
        "/upload/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      // Assuming the response contains the image URL
      setImageUrl(res.data.imageUrl);
      setSuccess("Image uploaded successfully!"); // Set success message
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError("Error uploading image. Please try again.");
      console.error(error);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleImageChange} />
      <button onClick={handleImageUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      {imageUrl && (
        <div>
          <p>Uploaded Image:</p>
          <img src={imageUrl} alt="Uploaded" width="200" />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
