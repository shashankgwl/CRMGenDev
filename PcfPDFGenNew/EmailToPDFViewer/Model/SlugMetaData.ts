interface ISlugDefinition {
    relationShipName: string;
    fieldName: string;
}


interface INameQueryPair {
    query: string,
    name: string,
    relationShipSlugs: ISlugDefinition[] 
}
