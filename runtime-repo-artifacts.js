/*
 * Runtime repository artifacts
 *
 * Nothing generated here is written back to the site. The browser fetches the
 * public repository files and creates a ZIP or Git bundle in memory only, then
 * immediately downloads the Blob. There are no dist/ archives required.
 */
(() => {
  'use strict';

  const textEncoder = new TextEncoder();

  function bytes(value) {
    return value instanceof Uint8Array ? value : new Uint8Array(value);
  }

  function concatBytes(...parts) {
    const arrays = parts.filter(Boolean).map(bytes);
    let total = 0;
    for (const arr of arrays) total += arr.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
      out.set(arr, offset);
      offset += arr.length;
    }
    return out;
  }

  function uint16le(n) {
    return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  }

  function uint32le(n) {
    return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
  }

  function uint32be(n) {
    return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
  }

  function crc32(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function safeFilename(name, fallback) {
    const clean = String(name || fallback || 'repo')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
    return clean || fallback || 'repo';
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function sha1(data) {
    return new Uint8Array(await crypto.subtle.digest('SHA-1', bytes(data)));
  }

  function hex(data) {
    return [...data].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function objectHeader(type, size) {
    let first = (type << 4) | (size & 0x0f);
    size = Math.floor(size / 16);
    const out = [first];
    while (size > 0) {
      let byte = size & 0x7f;
      size = Math.floor(size / 128);
      if (size > 0) byte |= 0x80;
      out.push(byte);
    }
    if (out.length > 1) out[0] |= 0x80;
    return new Uint8Array(out);
  }

  function packObjectHeader(type, size) {
    let first = (type << 4) | (size & 0x0f);
    size = Math.floor(size / 16);
    const out = [first];
    while (size > 0) {
      let byte = size & 0x7f;
      size = Math.floor(size / 128);
      if (size > 0) byte |= 0x80;
      out.push(byte);
    }
    if (out.length > 1) out[0] |= 0x80;
    return new Uint8Array(out);
  }

  async function deflateZlib(data) {
    if (!('CompressionStream' in window)) {
      throw new Error('Your browser does not support runtime Git bundle compression. Use a current Chrome, Edge, Safari, or Firefox build.');
    }
    const stream = new CompressionStream('deflate');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    await writer.write(bytes(data));
    await writer.close();
    const chunks = [];
    let total = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      const chunk = bytes(part.value);
      chunks.push(chunk);
      total += chunk.length;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  function buildVirtualTree(entries, fileBytesByPath) {
    const root = new Map();

    function ensureDir(name, map) {
      let node = map.get(name);
      if (!node) {
        node = { kind: 'dir', children: new Map() };
        map.set(name, node);
      }
      return node;
    }

    for (const entry of entries) {
      if (!entry || entry.type !== 'file') continue;
      const path = String(entry.path || '').replace(/^\/+|\/+$/g, '');
      if (!path || !fileBytesByPath.has(path)) continue;
      const parts = path.split('/');
      let cursor = root;
      for (let i = 0; i < parts.length - 1; i++) {
        cursor = ensureDir(parts[i], cursor).children;
      }
      cursor.set(parts[parts.length - 1], {
        kind: 'file',
        data: fileBytesByPath.get(path),
      });
    }

    return root;
  }

  function compareTreeNames(a, b) {
    const an = a.name + (a.node.kind === 'dir' ? '/' : '');
    const bn = b.name + (b.node.kind === 'dir' ? '/' : '');
    const aa = textEncoder.encode(an);
    const bb = textEncoder.encode(bn);
    const n = Math.min(aa.length, bb.length);
    for (let i = 0; i < n; i++) {
      if (aa[i] !== bb[i]) return aa[i] - bb[i];
    }
    return aa.length - bb.length;
  }

  async function buildGitSnapshot(entries, fileBytesByPath) {
    const treeRoot = buildVirtualTree(entries, fileBytesByPath);
    const objects = [];

    async function makeObject(typeName, typeNumber, content) {
      const header = textEncoder.encode(`${typeName} ${content.length}\0`);
      const full = concatBytes(header, content);
      const oid = await sha1(full);
      objects.push({ oid, typeNumber, content });
      return oid;
    }

    async function buildTree(map) {
      const rows = [...map.entries()].map(([name, node]) => ({ name, node })).sort(compareTreeNames);
      const chunks = [];
      for (const { name, node } of rows) {
        const oid = node.kind === 'file'
          ? await makeObject('blob', 3, node.data)
          : await buildTree(node.children);
        const mode = node.kind === 'dir' ? '40000' : '100644';
        chunks.push(textEncoder.encode(`${mode} ${name}\0`));
        chunks.push(oid);
      }
      return makeObject('tree', 2, concatBytes(...chunks));
    }

    const treeOid = await buildTree(treeRoot);
    const now = Math.floor(Date.now() / 1000);
    const author = 'Elite Hub <runtime@elite-hub.local>';
    const commitText = [
      `tree ${hex(treeOid)}`,
      `author ${author} ${now} +0000`,
      `committer ${author} ${now} +0000`,
      '',
      'Runtime snapshot generated by Elite Hub.',
      ''
    ].join('\n');
    const commitOid = await makeObject('commit', 1, textEncoder.encode(commitText));
    return { objects, commitOid };
  }

  async function createGitBundle(entries, fileBytesByPath, repoName) {
    const { objects, commitOid } = await buildGitSnapshot(entries, fileBytesByPath);
    const packParts = [textEncoder.encode('PACK'), uint32be(2), uint32be(objects.length)];

    for (const obj of objects) {
      const rawHeader = objectHeader(obj.typeNumber, obj.content.length);
      const compressed = await deflateZlib(obj.content);
      packParts.push(rawHeader, compressed);
    }

    const packWithoutChecksum = concatBytes(...packParts);
    const packChecksum = await sha1(packWithoutChecksum);
    const fullPack = concatBytes(packWithoutChecksum, packChecksum);
    const header = textEncoder.encode(`# v2 git bundle\n${hex(commitOid)} refs/heads/main\n\n`);
    return new Blob([header, fullPack], { type: 'application/octet-stream' });
  }

  function makeZipLocalHeader(nameBytes, crc, size) {
    return concatBytes(
      textEncoder.encode('PK\x03\x04'),
      uint16le(20),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint32le(crc),
      uint32le(size),
      uint32le(size),
      uint16le(nameBytes.length),
      uint16le(0),
      nameBytes
    );
  }

  function makeZipCentralHeader(nameBytes, crc, size, offset) {
    return concatBytes(
      textEncoder.encode('PK\x01\x02'),
      new Uint8Array([20, 0, 20, 0]),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint32le(crc),
      uint32le(size),
      uint32le(size),
      uint16le(nameBytes.length),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint16le(0),
      uint32le(0),
      uint32le(offset),
      nameBytes
    );
  }

  function createZip(entries, fileBytesByPath, repoName) {
    const files = entries.filter(e => e && e.type === 'file' && fileBytesByPath.has(e.path));
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of files) {
      const data = fileBytesByPath.get(entry.path);
      const nameBytes = textEncoder.encode(entry.path);
      const crc = crc32(data);
      const local = makeZipLocalHeader(nameBytes, crc, data.length);
      localParts.push(local, data);
      centralParts.push(makeZipCentralHeader(nameBytes, crc, data.length, offset));
      offset += local.length + data.length;
    }

    const central = concatBytes(...centralParts);
    const local = concatBytes(...localParts);
    const end = concatBytes(
      textEncoder.encode('PK\x05\x06'),
      uint16le(0), uint16le(0),
      uint16le(files.length), uint16le(files.length),
      uint32le(central.length), uint32le(local.length),
      uint16le(0)
    );
    return new Blob([local, central, end], { type: 'application/zip' });
  }

  async function fetchRepoBytes({ root, id, entries, concurrency = 6, onProgress }) {
    const files = entries.filter(e => e && e.type === 'file');
    const result = new Map();
    let cursor = 0;
    let done = 0;

    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= files.length) return;
        const entry = files[index];
        const safe = String(entry.path || '').replace(/^\/+/, '');
        const url = `${root}/${encodeURIComponent(id)}/${safe.split('/').map(encodeURIComponent).join('/')}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Could not read ${entry.path} (HTTP ${res.status})`);
        result.set(entry.path, new Uint8Array(await res.arrayBuffer()));
        done++;
        onProgress?.(done, files.length);
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, Math.max(files.length, 1)) }, worker);
    await Promise.all(workers);
    return result;
  }

  async function generateRepoArtifact({ root, id, entries, name, kind, onProgress }) {
    const fileBytes = await fetchRepoBytes({ root, id, entries, onProgress: (done, total) => onProgress?.('fetch', done, total) });
    let blob;
    let extension;
    if (kind === 'zip') {
      blob = createZip(entries, fileBytes, name);
      extension = 'zip';
    } else if (kind === 'bundle') {
      blob = await createGitBundle(entries, fileBytes, name);
      extension = 'bundle';
    } else {
      throw new Error(`Unsupported runtime artifact: ${kind}`);
    }
    return { blob, filename: `${safeFilename(name, id)}.${extension}` };
  }

  window.EliteHubRuntimeRepo = {
    generate: generateRepoArtifact,
    download: ({ blob, filename }) => downloadBlob(blob, filename),
  };
})();
