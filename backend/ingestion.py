import os
from dotenv import load_dotenv
from pypdf import PdfReader
from chromadb import Client
from chromadb.utils import embedding_functions
from langchain.text_splitter import RecursiveCharacterTextSplitter

load_dotenv()

# Initialize OpenAI client for embeddings
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key=os.getenv("OPENAI_API_KEY"),
    model_name="text-embedding-ada-002"
)

# Initialize ChromaDB client
chroma_client = Client()
collection_name = "master_ara_knowledge_base"
collection = chroma_client.get_or_create_collection(
    name=collection_name,
    embedding_function=openai_ef
)

def load_pdf(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def process_and_index_document(doc_path, doc_type):
    print(f"Processing {doc_path}...")
    content = ""
    if doc_type == "pdf":
        content = load_pdf(doc_path)
    elif doc_type == "markdown":
        with open(doc_path, 'r') as f:
            content = f.read()
    else:
        raise ValueError(f"Unsupported document type: {doc_type}")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        is_separator_regex=False,
    )
    chunks = text_splitter.split_text(content)

    # Generate unique IDs for each chunk
    ids = [f"{doc_path}-{i}" for i in range(len(chunks))]

    # Add to ChromaDB
    collection.add(
        documents=chunks,
        metadatas=[{"source": doc_path, "type": doc_type} for _ in chunks],
        ids=ids
    )
    print(f"Indexed {len(chunks)} chunks from {doc_path}")

if __name__ == '__main__':
    # Example usage:
    # Ensure your OPENAI_API_KEY is set in the .env file
    # And the PDF file exists at the specified path

    # Index the main curriculum PDF
    pdf_path = "../assets/materials/tkd-curriculum-aras-martial-arts.pdf"
    if os.path.exists(pdf_path):
        process_and_index_document(pdf_path, "pdf")
    else:
        print(f"Error: PDF file not found at {pdf_path}")

    # Index markdown study guides
    markdown_dir = "../assets/materials/"
    for filename in os.listdir(markdown_dir):
        if filename.endswith(".md"):
            md_path = os.path.join(markdown_dir, filename)
            process_and_index_document(md_path, "markdown")

    print("Data ingestion and indexing complete.")
