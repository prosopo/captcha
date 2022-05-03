import Extension from "../api/Extension";

export async function getExtension() {
    return await Extension.create();
}
