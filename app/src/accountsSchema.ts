import * as anchor from "@project-serum/anchor";
import Arweave from "arweave";
import { serialize, deserialize } from "borsh";

class Assignable extends Function {
    constructor(properties: any) {
      super();
      
      Object.keys(properties).map((key: string) => {
        return ((this as any)[key] = properties[key]);
      });
    }
  }
  
  class UserAccountWrapped extends Assignable { 
    public static deserialize(buffer: Buffer): [number, Buffer] {
      const schema = new Map([
        [
          UserAccountWrapped, 
          { 
            kind: 'struct', 
            fields: [
                ['discriminant', [8]],
                ['inner_size', 'u16'], 
              ] 
          }
        ]
      ]);
      const wrapped = deserialize(schema, UserAccountWrapped, buffer.slice(0, 8+2));
      const inner_size = (wrapped as any)['inner_size'];
      return [inner_size, buffer.slice(8+2, 8+2+inner_size)];
    }
  }
  
  export class UserAccount extends Assignable { 
    public static deserialize(buffer: Buffer): UserAccount {
      const schema = new Map([
        [
          UserAccount, 
          { 
            kind: 'struct', 
            fields: [
              ['username', 'String'], 
              ['max_score', 'u64'], 
              ['saved_game_sessions', 'u64'],
              ['user_wallet', [32]],
  //            ['mint', [32]],
              ['token_account', [32]],
              ['arweave_storage_address', 'String'],
              ['has_active_game_session', 'u8'] 
            ] 
          }
        ]
      ]);
      const [data_size, inner_buffer] = UserAccountWrapped.deserialize(buffer);
  //    console.log("----------- DATA SIZE: ", data_size);
      let data = deserialize(schema, UserAccount, inner_buffer);
  //    let data = deserialize(schema, UserAccount, buffer.slice(8+2, buffer.length));
  //    console.log("----------- DATA: ", data);
      return data;
    }
  }
  
  export class GameSessionAccount extends Assignable { 
    public static deserialize(buffer: Buffer): GameSessionAccount {
      const schema = new Map([
        [
          GameSessionAccount, 
          { 
            kind: 'struct', 
            fields: [
                ['discriminant', [8]],
                ['user_account', [32]],
                ['score', 'u64'], 
                ['duration_millis', 'u64'], 
                ['stake', 'u64'], 
              ] 
          }
        ]
      ]);
      const acc = deserialize(schema, GameSessionAccount, 
        buffer.slice(0, 8+32+8+8+8));
      return acc;
    }
  }
  
  export class GameSessionArchive extends Assignable { 
    static schema: Map<GameSessionArchive, any> = new Map([
      [
        GameSessionArchive, 
        { 
          kind: 'struct', 
          fields: [
              ['score', 'u64'], 
              ['duration', 'u64']
            ] 
        }
      ]
    ]);
  
    public static serialize(data: any): Uint8Array {
      let buffer = serialize(GameSessionArchive.schema, new GameSessionArchive(data));
      return buffer;
    }
  
    public static deserialize(buffer: Uint8Array) {
      try {
        const data = deserialize(GameSessionArchive.schema, GameSessionArchive, Buffer.from(buffer));
        } catch(e) {
          console.log(e);
          throw e;
        }
    }
  
    public static async getArchiveIds(
      arweave: Arweave, 
      userAccount: anchor.web3.PublicKey, 
      numberOfArchives: number
    ) {
      const queryObject = { query: `{
        transactions(first: ${numberOfArchives},
          tags: [
            {
              name: "App-Name",
              values: ["Stakan"]
            },
            {
              name: "User",
              values: ["${userAccount}"]
            },
          ]
        ) {
          edges {
            node {
              id
              owner {
                address
              }
              data {
                size
              }
              block {
                height
                timestamp
              }
              tags {
                name,
                value
              }
            }
          }
        }
      }`}
  //    console.log("queryObject: ", queryObject);
      let results = await arweave.api.post('/graphql', queryObject);
  
      return results.data.data.transactions.edges.map((edge: any) => edge.node.id);
    }
  
    public static async get(
      arweave: Arweave, 
      userAccount: anchor.web3.PublicKey, 
      numberOfArchives: number
    ) {
      const archiveIds = await this.getArchiveIds(arweave, userAccount, numberOfArchives);
  
  //    console.log("ARCHIVE IDS: ", archiveIds);    
      const archivedData = archiveIds.map(async (id: any) => {
        const buffer = await arweave.transactions.getData(id,
          { decode: true, string: false }
        );
        const data = deserialize(GameSessionArchive.schema, GameSessionArchive, Buffer.from(buffer));
  //      console.log("DATA: ", data);
        return data;
      });
      return archivedData;
  /*    
      edges.map(async edge => {
        console.log("Node ID: " + edge.node.id);
        const buffer = await arweave.transactions.getData(
          edge.node.id,
          { decode: true, string: false }
        );
  
        console.log("BUFFER FROM ARCHIVE: ", buffer);
  
        try {
        const data = deserialize(GameSessionArchive.schema, GameSessionArchive, Buffer.from(buffer));
        console.log("Data from Arweave: score, ", data['score'].toString(), ", duration: ", data['duration'].toString() );
        } catch(e) {
          console.log(e);
          throw e;
        }
        //      const data =  Buffer.from(buffer);
      });
      */
  
  //    return edges;
    }
  }
  