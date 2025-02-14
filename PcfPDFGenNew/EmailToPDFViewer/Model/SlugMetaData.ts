interface ISlugDefinition {
    relationShipName: string;
    fieldName: string;
}


interface nameQueryPair {
    query: string,
    name: string,
    relationShipSlugs: ISlugDefinition[] 
}
