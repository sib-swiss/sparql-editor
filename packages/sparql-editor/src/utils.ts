import {useIcon} from "./styles";

// Replace the longest prefix in a URI with its corresponding prefix
export function compressUri(prefixes: {[key: string]: string}, uri: string): string | null {
  let longestPrefix = "";
  for (const prefix in prefixes) {
    if (uri.startsWith(prefixes[prefix]) && prefix.length > longestPrefix.length) {
      longestPrefix = prefix;
    }
  }
  if (longestPrefix === "") return null;
  return uri.replace(prefixes[longestPrefix], longestPrefix + ":");
}

// Extract all subjects and their types from a SPARQL query in the process of being written
export function extractAllSubjectsAndTypes(query: string): Map<string, Set<string>> {
  const subjectTypeMap = new Map<string, Set<string>>();
  // Remove comments and string literals, and prefixes lines to avoid false matches
  const cleanQuery = query
    .replace(/^#.*$/gm, "")
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/^PREFIX\s+.*$/gim, "")
    .replace(/;\s*\n/g, "; ") // Put all triple patterns on a single line
    .replace(/;\s*$/g, "; ");
  // console.log(cleanQuery)
  const typePattern =
    /\s*(\?\w+|<[^>]+>|\w+:\w*).*?\s+(?:a|rdf:type|<http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#type>)\s+([^\s.]+(?:\s*,\s*[^\s.]+)*)\s*(?:;|\.)/g;
  let match;
  while ((match = typePattern.exec(cleanQuery)) !== null) {
    const subject = match[1];
    const types = match[2].split(/\s*,\s*/); // Split types separated by commas
    if (!subjectTypeMap.has(subject)) {
      subjectTypeMap.set(subject, new Set());
    }
    const subjectTypes = subjectTypeMap.get(subject)!;
    types.forEach(type => subjectTypes.add(type));
  }
  return subjectTypeMap;
}

// Extract the subject relevant to the cursor position from a SPARQL query
export function getSubjectForCursorPosition(query: string, lineNumber: number, charNumber: number): string | null {
  const lines = query.split("\n");
  // Extract the part of the line up to the cursor position
  const partOfLine = lines[lineNumber].slice(0, charNumber);
  const partialQuery = lines.slice(0, lineNumber).join("\n") + "\n" + partOfLine;
  // Put all triple patterns on a single line
  const cleanQuery = partialQuery.replace(/;\s*\n/g, "; ").replace(/;\s*$/g, "; ");
  const partialLines = cleanQuery.split("\n");
  const lastLine = partialLines[partialLines.length - 1];
  const subjectMatch = lastLine.match(/\s*([?\w]+|<[^>]+>|\w+:\w*)\s+/);
  if (subjectMatch) {
    return subjectMatch[1];
  }
  return null;
}

export function getServiceUriForCursorPosition(query: string, lineNumber: number, charNumber: number): string | null {
  const lines = query.split("\n");
  const partOfLine = lines[lineNumber].slice(0, charNumber);
  const partialQuery = lines.slice(0, lineNumber).join("\n") + "\n" + partOfLine;
  const serviceRegex = /SERVICE\s+<([^>]+)>\s*{/gi;
  let match;
  // Iterate through all SERVICE blocks in the query
  while ((match = serviceRegex.exec(query)) !== null) {
    const serviceUri = match[1];
    const serviceStart = match.index + match[0].length - 1; // Start of the opening brace '{'
    // Find the matching closing brace accounting for nested braces
    let braceDepth = 1;
    let serviceEnd = serviceStart;
    for (let i = serviceStart + 1; i < query.length; i++) {
      if (query[i] === "{") {
        braceDepth++;
      } else if (query[i] === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          serviceEnd = i;
          break;
        }
      }
    }
    // Check if cursor is inside this SERVICE block
    const cursorPosition = partialQuery.length;
    if (cursorPosition >= serviceStart && cursorPosition <= serviceEnd) {
      return serviceUri;
    }
  }
  return null;
}

export function createUseButton() {
  // Create use button
  const useBtn = document.createElement("button");
  useBtn.innerHTML = useIcon;
  useBtn.title = "Load this example query in the editor";
  useBtn.style.marginLeft = "0.5em";
  useBtn.className = "btn use-sparql-example-btn";
  return useBtn;
}

// Automatically generates a tab label from a query description by removing small words and stopwords
export function generateTabLabel(description: string): string {
  // const stopwords = ['all', 'with', 'and', 'the', 'on', 'of', 'in', 'for', 'a', 'an', 'entries', 'annotated'];
  const ignoreStopwords = [
    "select",
    "that",
    "this",
    "query",
    "with",
    "entries",
    "annotated",
    "were",
    "triples",
    "relate",
    "entry",
    "each",
    "using",
    "where",
    "find",
    "list",
    "sometimes",
    "known",
    "their",
    "them",
    "from",
    "these",
    "what",
    "used",
    "have",
  ];
  // Remove HTML tags and parenthesis
  const words = description
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/[(),]/gm, "")
    .split(" ");
  const filteredWords = words.filter(word => !ignoreStopwords.includes(word.toLowerCase()) && word.length > 3);
  const label = filteredWords.slice(0, 3).join(" ");
  const capitalizedLabel = label
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return capitalizedLabel;
}

// NOTE: In case we need to store the counts
// type VoidDict2 = {
//   // Subject class
//   [key: string]: {
//     count?: number;
//     predicates: {
//       [key: string]: {
//         count?: number;
//         objectClasses: {
//           [key: string]: number | null;
//         };
//       }
//     }
//   };
// };
