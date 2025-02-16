interface ISlugDefinition {
    entityOrRelationShipName: string;
    fieldName: string;
}


interface INameQueryPair {
    query: string,
    name: string,
    relationShipSlugs: ISlugDefinition[] 
}
