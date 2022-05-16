import Extension from "../api/Extension";

export async function getExtension(): Promise<Extension> {
    return await Extension.create();
}
