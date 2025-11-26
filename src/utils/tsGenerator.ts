/**
 * JSON을 TypeScript 인터페이스로 변환합니다.
 */
export function jsonToTypeScript(
  json: unknown,
  rootName: string = "Root"
): string {
  const interfaces: string[] = [];
  const generatedTypes = new Map<string, string>();

  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function sanitizeName(name: string): string {
    // 숫자로 시작하거나 특수문자가 있으면 처리
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");
    if (/^\d/.test(sanitized)) {
      sanitized = "_" + sanitized;
    }
    return capitalize(sanitized);
  }

  function getTypeString(value: unknown, propertyName: string): string {
    if (value === null) {
      return "null";
    }

    if (value === undefined) {
      return "undefined";
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "unknown[]";
      }

      // 배열의 첫 번째 요소로 타입 추론
      const firstElement = value[0];
      const elementType = getTypeString(firstElement, propertyName + "Item");

      // 객체 배열인 경우 인터페이스 생성
      if (
        typeof firstElement === "object" &&
        firstElement !== null &&
        !Array.isArray(firstElement)
      ) {
        return `${elementType}[]`;
      }

      return `${elementType}[]`;
    }

    if (typeof value === "object") {
      const interfaceName = sanitizeName(propertyName);
      generateInterface(value as Record<string, unknown>, interfaceName);
      return interfaceName;
    }

    switch (typeof value) {
      case "string":
        return "string";
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      default:
        return "unknown";
    }
  }

  function generateInterface(
    obj: Record<string, unknown>,
    name: string
  ): void {
    // 이미 생성된 타입인지 확인 (중복 방지)
    const objSignature = JSON.stringify(Object.keys(obj).sort());
    if (generatedTypes.has(objSignature)) {
      return;
    }
    generatedTypes.set(objSignature, name);

    const properties: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const typeString = getTypeString(value, key);
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
        ? key
        : `"${key}"`;
      properties.push(`  ${safeKey}: ${typeString};`);
    }

    const interfaceStr = `interface ${name} {\n${properties.join("\n")}\n}`;
    interfaces.push(interfaceStr);
  }

  // 루트 타입 처리
  if (Array.isArray(json)) {
    if (json.length === 0) {
      return `type ${rootName} = unknown[];`;
    }

    const firstElement = json[0];
    if (
      typeof firstElement === "object" &&
      firstElement !== null &&
      !Array.isArray(firstElement)
    ) {
      generateInterface(
        firstElement as Record<string, unknown>,
        rootName + "Item"
      );
      return `${interfaces.join("\n\n")}\n\ntype ${rootName} = ${rootName}Item[];`;
    }

    const elementType = getTypeString(firstElement, rootName + "Item");
    return `type ${rootName} = ${elementType}[];`;
  }

  if (typeof json === "object" && json !== null) {
    generateInterface(json as Record<string, unknown>, rootName);
    return interfaces.join("\n\n");
  }

  // 프리미티브 타입
  const primitiveType = getTypeString(json, rootName);
  return `type ${rootName} = ${primitiveType};`;
}

/**
 * JSON 문자열을 TypeScript 인터페이스로 변환합니다.
 */
export function jsonStringToTypeScript(
  jsonString: string,
  rootName: string = "Root"
): string {
  try {
    const parsed = JSON.parse(jsonString);
    return jsonToTypeScript(parsed, rootName);
  } catch {
    return "// JSON 파싱 오류: 유효한 JSON을 입력하세요.";
  }
}
