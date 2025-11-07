import { Document } from "domhandler";
import { createDocumentStream, type Options } from "htmlparser2";

export * from "domhandler";
export * from "htmlparser2";
export * from "dom-serializer";
export * as CSS from "css-select";

export function parseDocumentAsync(data: string, options: Options): Promise<Document> {
    return new Promise((resolve, reject) => {
        const parser = createDocumentStream((error, document) => {
            if (error) reject(error);
            else resolve(document);
        }, options);

        let index = 0;
        function task() {
            const chunk = data.slice(index, index + 1024);
            index += chunk.length;
            parser.write(chunk);
            if (index < data.length) {
                setTimeout(task, 0);
            } else {
                parser.end();
            }
        }
        task();
    });
}
