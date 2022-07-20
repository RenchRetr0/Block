import { readFileSync } from 'fs';
import { sys } from 'typescript';
import File from './file';

async function main() {
  const file = new File('test');
  let base = `iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAmSURBVBhXY/iPDaCIMjBAuTAKzgczUNQCAYooPrUIOQiFAv7/BwD4qX2DDT4lYAAAAABJRU5ErkJggg==`;
  console.log(sys.args)
  if(sys.args.length >= 2) {
    const fileBuff = readFileSync(sys.args[1]);
    base = fileBuff.toString('base64');
  }

  const res = await file.uploadFile({
    file: base
  });
  console.log(res);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });