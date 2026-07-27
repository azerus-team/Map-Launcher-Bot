

function googleDriveToDirectUrl(input) {
    let url;

    try {
        url = new URL(input);
    } catch {
        return null;
    }

    if (url.hostname !== "drive.google.com") {
        return null;
    }

    let fileId = url.searchParams.get("id");

    if (!fileId) {
        const parts = url.pathname.split("/");
        const dIndex = parts.indexOf("d");

        if (dIndex !== -1) {
            fileId = parts[dIndex + 1];
        }
    }

    return fileId
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : null;
}

exports.directGoogle = googleDriveToDirectUrl;